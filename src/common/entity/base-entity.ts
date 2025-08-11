import {Column, CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn} from "typeorm";
import {ApiProperty} from "@nestjs/swagger";
import {StatusEnum} from "../enum/status.enum";


export abstract class BaseEntity{

    @PrimaryGeneratedColumn('uuid')
    @ApiProperty({
        description: "The unique identifier of the health data record"
    })
    id: string

    @CreateDateColumn()
    @ApiProperty({ description: "The date when the record was created" })
    createdAt: Date;

    @UpdateDateColumn()
    @ApiProperty({ description: "The date when the record was last updated" })
    updatedAt: Date;

    @Column({
        type: 'enum',
        enum: StatusEnum,
        default: StatusEnum.ACTIVE,
        nullable: false
    })
    @ApiProperty({description:"The status of the record"})
    status : StatusEnum

}