import {
  IsBoolean,
  IsNotEmpty,
  IsString,
  IsUrl,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class UpdateWebhookEndpointDto {
  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsUrl({
    require_protocol: true,
    protocols: ['http', 'https'],
  })
  url?: string;

  @ValidateIf((_, value: unknown) => value !== undefined)
  @IsBoolean()
  isActive?: boolean;
}
