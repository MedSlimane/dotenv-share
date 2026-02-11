import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const create = mutation({
  args: {
    name: v.string(),
    inviteCodeHash: v.string(),
    encryptionSalt: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check for duplicate invite code hash
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_invite_code", (q) =>
        q.eq("inviteCodeHash", args.inviteCodeHash),
      )
      .unique();
    if (existing)
      throw new Error(
        "This invite code is already in use. Please choose a different one.",
      );

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      ownerId: userId,
      inviteCodeHash: args.inviteCodeHash,
      encryptionSalt: args.encryptionSalt,
    });

    await ctx.db.insert("orgMembers", {
      orgId,
      userId,
      role: "owner",
    });

    return orgId;
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        return org ? { ...org, role: m.role } : null;
      }),
    );

    return orgs.filter((o) => o !== null);
  },
});

export const get = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", userId),
      )
      .unique();

    if (!membership) throw new Error("Not a member of this organization");

    const org = await ctx.db.get(args.orgId);
    if (!org) throw new Error("Organization not found");

    return { ...org, role: membership.role };
  },
});

export const join = mutation({
  args: {
    inviteCodeHash: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const org = await ctx.db
      .query("organizations")
      .withIndex("by_invite_code", (q) =>
        q.eq("inviteCodeHash", args.inviteCodeHash),
      )
      .unique();

    if (!org) throw new Error("Invalid invite code");

    const existing = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", org._id).eq("userId", userId),
      )
      .unique();

    if (existing)
      throw new Error("You are already a member of this organization");

    await ctx.db.insert("orgMembers", {
      orgId: org._id,
      userId,
      role: "member",
    });

    return org._id;
  },
});

export const getMembers = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", userId),
      )
      .unique();

    if (!membership) throw new Error("Not a member");

    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();

    return Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          email: user?.email ?? "Unknown",
        };
      }),
    );
  },
});

export const removeMember = mutation({
  args: {
    orgId: v.id("organizations"),
    memberId: v.id("orgMembers"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentMembership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", args.orgId).eq("userId", userId),
      )
      .unique();

    if (!currentMembership || currentMembership.role !== "owner") {
      throw new Error("Only owners can remove members");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member || member.orgId !== args.orgId) {
      throw new Error("Member not found");
    }

    if (member.role === "owner") {
      throw new Error("Cannot remove the owner");
    }

    await ctx.db.delete(args.memberId);
  },
});

export const deleteOrg = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const org = await ctx.db.get(args.orgId);
    if (!org || org.ownerId !== userId) {
      throw new Error("Only the owner can delete the organization");
    }

    const envFiles = await ctx.db
      .query("envFiles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const file of envFiles) {
      await ctx.db.delete(file._id);
    }

    const members = await ctx.db
      .query("orgMembers")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
    for (const member of members) {
      await ctx.db.delete(member._id);
    }

    await ctx.db.delete(args.orgId);
  },
});
