import {BadRequestException, Injectable, InternalServerErrorException, Logger} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {PutObjectCommand, S3Client} from '@aws-sdk/client-s3';
import {v4 as uuidv4} from 'uuid';

@Injectable()
export class FileUploadService {
    private readonly s3Client: S3Client;
    private readonly logger = new Logger(FileUploadService.name);

    constructor(private readonly configService: ConfigService) {
        // Initialize S3 client
        this.s3Client = new S3Client({
            region: this.configService.get<string>('aws.s3.region'),
            credentials: {
                accessKeyId: this.configService.get<string>('aws.s3.accessKeyId'),
                secretAccessKey: this.configService.get<string>('aws.s3.secretAccessKey'),
            },
        });
    }

    /**
     * Upload a file to AWS S3
     * @param file The file to upload
     * @param folder Optional folder path within the bucket
     * @returns The URL of the uploaded file
     */
    async uploadFile(file: Express.Multer.File, folder = 'avatars'): Promise<string> {
        if (!file) {
            throw new BadRequestException('File is required');
        }

        try {
            // Validate file type
            this.validateFileType(file);

            // Generate a unique filename
            const fileExtension = file.originalname.split('.').pop();
            const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

            // Upload to S3
            await this.s3Client.send(
                new PutObjectCommand({
                    Bucket: this.configService.get<string>('aws.s3.bucketName'),
                    Key: fileName,
                    Body: file.buffer,
                    ContentType: file.mimetype,
                    ACL: 'public-read', // Make the file publicly accessible
                }),
            );

            // Return the URL of the uploaded file
            const baseUrl = this.configService.get<string>('aws.s3.baseUrl');
            return `${baseUrl}/${fileName}`;
        } catch (error) {
            this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to upload file');
        }
    }

    /**
     * Validate file type
     * @param file The file to validate
     * @throws BadRequestException if file type is invalid
     */
    private validateFileType(file: Express.Multer.File): void {
        const allowedMimeTypes = [
            'image/jpeg',
            'image/png',
            'image/gif',
            'image/webp',
            'image/bmp',
            'image/svg+xml',
            'image/x-icon',
            'video/mp4',
            'video/quicktime'
        ];

        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException(
                `Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`,
            );
        }
    }
}