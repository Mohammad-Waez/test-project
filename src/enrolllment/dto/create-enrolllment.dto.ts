import { IsEnum, IsNotEmpty } from "class-validator"

import { EnrollmentStatus } from "../../common/enums/index.js"

export class CreateEnrolllmentDto {



@IsNotEmpty()
userId:number


@IsNotEmpty()
programId:number

@IsEnum(EnrollmentStatus)
enrolmentStatus:EnrollmentStatus

}
