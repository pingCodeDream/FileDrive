import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUser } from "./users";

export const generateUploadUrl = mutation(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    console.log(identity);

    if (!identity) {
        throw new ConvexError('you must be logged in to upload a file');
    }

    return await ctx.storage.generateUploadUrl();
});


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

        const hasAccess = 
            user.orgIds.includes(args.orgId) || 
            user.tokenIdentifier === args.orgId;
    
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
        
        return ctx.db.query("files")
        .withIndex("by_orgId", q => q.eq("orgId", args.orgId))
        .collect();
    }
}); 