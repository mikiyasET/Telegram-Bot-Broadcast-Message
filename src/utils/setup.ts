import prisma from "./client";
// import {hashPassword} from "./auth";
// import {AdminRole, AdminStatus} from "@prisma/client";

export const setUp = async (): Promise<boolean> => {
    // const adminCount = await prisma.admin.count();
    // if (adminCount == 0) {
    //     const password = await hashPassword("12341234");
    //     await prisma.admin.create({
    //         data: {
    //             name: "Mikiyas Lemlemu",
    //             email: "mikiyaslemlemu@gmail.com",
    //             password: password,
    //             role: AdminRole.superAdmin,
    //             status: AdminStatus.active,
    //         }
    //     });
    //     return true;
    // }
    // return false;
    return false;
}