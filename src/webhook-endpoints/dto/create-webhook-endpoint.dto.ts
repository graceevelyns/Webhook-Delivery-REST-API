import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateWebhookEndpointDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  url!: string;
}
