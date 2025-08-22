import {BaseEntity} from "../../common/entity/base-entity";
import {Column, Entity} from "typeorm";
import {ApiProperty} from "@nestjs/swagger";

@Entity("report_reason")
export class ReportReason extends BaseEntity {

    @Column({name: "reason_text"})
    @ApiProperty({description: "Reason or main content of the violation report"})
    reasonText: string

}