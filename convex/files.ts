import { ConvexError, v } from "convex/values";
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server";
import { getUser } from "./users";

export const generateUploadUrl = mutation(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log(identity);

    if (!identity) {
        throw new ConvexError('you must be logged in to upload a file');
    }

    return await ctx.storage.generateUploadUrl();
});

async function hasAccessToOrg(
    ctx : QueryCtx | MutationCtx,
    tokenIdentifier: string, orgId: string) {
    const user = await getUser(ctx, tokenIdentifier);

    const hasAccess = 
        user.orgIds.includes(orgId) || 
        user.tokenIdentifier.includes(orgId);

    console.log(hasAccess);

    return hasAccess;
}

export const createFile = mutation({
    args:{
        name: v.string(),
        fileId: v.id("_storage"),
        orgId: v.string(),
    },
    async handler(ctx, args) {
        
        const identity = await ctx.auth.getUserIdentity();
        console.log(identity);

        if (!identity) {
            throw new ConvexError('you must be logged in to upload a file');
        }

        const user = await getUser(ctx, identity.tokenIdentifier);

        const hasAccess = await hasAccessToOrg(
            ctx,
            identity.tokenIdentifier,
            args.orgId
        );
    
        console.log(hasAccess);

        if (!hasAccess) {
            throw new ConvexError("you do not have access to this org");
        }

        await ctx.db.insert("files", {
            name: args.name,
            fileId: args.fileId,
            orgId: args.orgId,
        })

    },
});

export const getFiles = query({
    args: {
        orgId: v.string()
    },

    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return [];
        }

        const hasAccess = await hasAccessToOrg(
            ctx,
            identity.tokenIdentifier,
            args.orgId,
        );

        if(!hasAccess) {
            return [];
        }
        
        return ctx.db.query("files")
        .withIndex("by_orgId", q => q.eq("orgId", args.orgId))
        .collect();
    }
});

export const deleteFile = mutation({
    args: { fileId: v.id("files") },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError("you do not have access to this org");
        }

        const file = await ctx.db.get(args.fileId);

        if(!file) {
            throw new ConvexError("this file does not exist");
        }

        const hasAccess = await hasAccessToOrg(
            ctx,
            identity.tokenIdentifier,
            file.orgId
        );

        if (!hasAccess) {
            throw new ConvexError("you do not have this access to delete this file");
        }

        await ctx.db.delete(args.fileId);
    },
});