import { Module, forwardRef } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { FileUploadService } from "./file-upload.service";
import { UsersModule } from "../users/users.module";
import awsConfig from "./file-upload.config";

@Module({
  imports: [ConfigModule.forFeature(awsConfig), forwardRef(() => UsersModule)],
  controllers: [],
  providers: [FileUploadService],
  exports: [FileUploadService],
})
export class FileUploadModule {}
