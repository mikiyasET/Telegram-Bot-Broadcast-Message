import {AdminRole, AdminStatus} from "@prisma/client";

export type AdminType = {
    id: string,
    email: string,
    name: string,
    role: AdminRole,
    status: AdminStatus,
    updatedAt: Date,
    createdAt: Date,
}