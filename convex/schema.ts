import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  organizations: defineTable({
    name: v.string(),
    ownerId: v.id("users"),
    inviteCodeHash: v.string(),
    encryptionSalt: v.string(),
  })
    .index("by_owner", ["ownerId"])
    .index("by_invite_code", ["inviteCodeHash"]),

  orgMembers: defineTable({
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("owner"), v.literal("member")),
  })
    .index("by_org", ["orgId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["orgId", "userId"]),

  envFiles: defineTable({
    orgId: v.id("organizations"),
    name: v.string(),
    fileType: v.optional(v.union(v.literal("env"), v.literal("markdown"))),
    encryptedContent: v.string(),
    iv: v.string(),
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
  }).index("by_org", ["orgId"]),
});
