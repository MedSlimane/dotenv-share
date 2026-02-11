import { v } from "convex/values";
import { query, mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";

async function checkMembership(
  ctx: QueryCtx | MutationCtx,
  orgId: Id<"organizations">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("orgMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("orgId", orgId).eq("userId", userId),
    )
    .unique();
  if (!membership) throw new Error("Not a member of this organization");
  return membership;
}

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    encryptedContent: v.string(),
    iv: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await checkMembership(ctx, args.orgId, userId);

    return ctx.db.insert("envFiles", {
      orgId: args.orgId,
      name: args.name,
      encryptedContent: args.encryptedContent,
      iv: args.iv,
      createdBy: userId,
      updatedBy: userId,
    });
  },
});

export const list = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await checkMembership(ctx, args.orgId, userId);

    return ctx.db
      .query("envFiles")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const get = query({
  args: { envId: v.id("envFiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const envFile = await ctx.db.get(args.envId);
    if (!envFile) throw new Error("Env file not found");

    await checkMembership(ctx, envFile.orgId, userId);

    return envFile;
  },
});

export const update = mutation({
  args: {
    envId: v.id("envFiles"),
    encryptedContent: v.string(),
    iv: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const envFile = await ctx.db.get(args.envId);
    if (!envFile) throw new Error("Env file not found");

    await checkMembership(ctx, envFile.orgId, userId);

    await ctx.db.patch(args.envId, {
      encryptedContent: args.encryptedContent,
      iv: args.iv,
      updatedBy: userId,
    });
  },
});

export const remove = mutation({
  args: { envId: v.id("envFiles") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const envFile = await ctx.db.get(args.envId);
    if (!envFile) throw new Error("Env file not found");

    await checkMembership(ctx, envFile.orgId, userId);

    await ctx.db.delete(args.envId);
  },
});

export const rename = mutation({
  args: {
    envId: v.id("envFiles"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const envFile = await ctx.db.get(args.envId);
    if (!envFile) throw new Error("Env file not found");

    await checkMembership(ctx, envFile.orgId, userId);

    await ctx.db.patch(args.envId, {
      name: args.name,
      updatedBy: userId,
    });
  },
});
