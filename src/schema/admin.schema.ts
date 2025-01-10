import {z} from "zod";

export const createAdminSchema = z.object({
    name: z.string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string"
    }).min(3, {message: "Name must be at least 3 characters"}),
    email: z.string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string"
    }).email({message: "Invalid email"}),
    password: z.string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string"
    }).min(6, {message: "Password must be at least 6 characters"}),
    status: z.enum(['active', 'suspended', 'pending', 'deleted', 'retired'], {
        required_error: "status is required",
        invalid_type_error: "Invalid status"
    }).optional(),
    role: z.enum(['superAdmin', 'medicineMod', 'pharmacyMod'], {
        required_error: "Role is required",
        invalid_type_error: "Invalid role"
    })
});
export const updateAdminSchema = z.object({
    name: z.string({
        required_error: "Name is required",
        invalid_type_error: "Name must be a string"
    }).min(3, {message: "Name must be at least 3 characters"}).optional(),
    email: z.string({
        required_error: "Email is required",
        invalid_type_error: "Email must be a string"
    }).email({message: "Invalid email"}).optional(),
    password: z.string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string"
    }).min(6, {message: "Password must be at least 6 characters"}).optional(),
    status: z.enum(['active', 'suspended', 'pending', 'deleted', 'retired'], {
        required_error: "status is required",
        invalid_type_error: "Invalid status"
    }).optional(),
    role: z.enum(['superAdmin', 'medicineMod', 'pharmacyMod'], {
        required_error: "Role is required",
        invalid_type_error: "Invalid role"
    }).optional()
});
export const passwordSchema = z.object({
    current: z.string({
        required_error: "Current password is required",
        invalid_type_error: "Current password must be a string"
    }).min(6, {message: "Current password must be at least 6 characters"}),
    password: z.string({
        required_error: "Password is required",
        invalid_type_error: "Password must be a string"
    }).min(6, {message: "Password must be at least 6 characters"}),
})