import { object, z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../trpc";
import { processModel, serverModel, statModel, userModel } from "@pm2.web/mongoose-models";
import { TRPCError } from "@trpc/server";

export const userRouter = router({
  changePassword: protectedProcedure
    .input(
      z
        .object({
          oldPassword: z.string(),
          newPassword: z.string(),
          confirmPassword: z.string(),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "Passwords don't match",
          path: ["confirmPassword"],
        }),
    )
    .mutation(async (opts) => {
      const { oldPassword, newPassword } = opts.input;
      const { user } = opts.ctx;

      if (!(await user.checkPassword(oldPassword))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Password is incorrect" });
      }

      user.password = newPassword;
      await user.save();

      return "Password updated successfully!";
    }),
  deleteAccount: protectedProcedure.input(z.object({ password: z.string() })).mutation(async (opts) => {
    const { password } = opts.input;
    const { user } = opts.ctx;
    if (!(await user.checkPassword(password))) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Password is incorrect" });
    }
    await userModel.findByIdAndDelete(user._id);
    return "Deleted User";
  }),
  unlinkOAuth2: protectedProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;
    if (!user.oauth2?.provider) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Account is not linked to an OAuth2 Provider" });
    }

    const currentProvider = user.oauth2?.provider;
    user.oauth2 = undefined;
    await user.save();

    return `${currentProvider?.toLocaleUpperCase()} OAuth2 unlinked`;
  }),
});

export type userRouter = typeof userRouter;
