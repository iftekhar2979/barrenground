import { IsMongoId, IsOptional, IsString, Length } from "class-validator";
import { ObjectId } from "mongoose";

export class ReportDto {
    @IsMongoId()
    @IsOptional()
    reportedBy: ObjectId;
    @IsMongoId()
    userID: ObjectId;
    @IsString({message: "Reason must be a string"})
    @Length(3, 30, {message: "Reason must be between 3 and 30 characters long"})
    title: string;
    @IsString({message: "Details must be a string"})
    @Length(3, 200, {message: "Details must be between 3 and 200 characters long"})
    description: string;
}