import {customAlphabet} from "nanoid";
import path from "path";
import sharp from "sharp";
import fs from "fs";

const processFile = async (file: Express.Multer.File, paths: string): Promise<string> => {
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-', 36);
    const isStaging = process.env.NODE_ENV === 'staging';
    const width = 500;
    const height = 500;
    const extension = path.extname(file.originalname);
    let imageName = `${nanoid()}_${Date.now()}${extension}`;
    await sharp(file.buffer).resize(width, height).toFile(process.cwd() + `/public/${paths}/${imageName}`);
    return imageName;
};
export const nameImages = async ({image, images = [], multi = false, paths, quality = 100}: {
    image?: Express.Multer.File,
    images?: Express.Multer.File[],
    multi?: boolean,
    paths: string,
    quality?: number
}): Promise<string[] | string> => {
    let addedImages: string[] = [];
    if (multi) {
        for (const file of (images as Express.Multer.File[])) {
            const imageName = await processFile(file, paths);
            addedImages.push(imageName);
        }
        return addedImages;
    } else if (image) {
        const imageName = await processFile(image, paths);
        return imageName;
    } else {
        return [];
    }
};
export const deleteFile = async (fileName: string, path: string): Promise<void> => {
    const filePath = process.cwd() + `/public/${path}/${fileName}`;
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`File ${fileName} deleted from local storage.`);
    } else {
        throw new Error(`File ${fileName} not found locally at ${filePath}`);
    }
};