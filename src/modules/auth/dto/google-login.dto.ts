import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @ApiProperty({
    description: 'Google ID token obtained from the client-side Google Sign-In SDK',
    example: 'motcaichuoigidoratladai',
  })
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
