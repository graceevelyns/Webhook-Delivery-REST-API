import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { WebhookEndpoint } from '../../webhook-endpoints/entities/webhook-endpoint.entity.js';
import { Event } from '../../events/entities/event.entity.js';

export enum DeliveryStatus {
  Pending = 'PENDING',
  Processing = 'PROCESSING',
  Success = 'SUCCESS',
  Failed = 'FAILED',
}

@Index(
  'UQ_deliveries_event_endpoint_attempt',
  ['eventId', 'webhookEndpointId', 'attemptNumber'],
  { unique: true },
)
@Index('IDX_deliveries_webhook_endpoint_id', ['webhookEndpointId'])
@Check('CHK_deliveries_attempt_number', '"attempt_number" >= 1')
@Entity({ name: 'deliveries' })
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'event_id', type: 'uuid' })
  eventId!: string;

  @Column({ name: 'webhook_endpoint_id', type: 'uuid' })
  webhookEndpointId!: string;

  @Column({ name: 'target_url', type: 'text' })
  targetUrl!: string;

  @Column({ name: 'attempt_number', type: 'integer', default: 1 })
  attemptNumber!: number;

  @Column({
    type: 'enum',
    enum: DeliveryStatus,
    enumName: 'delivery_status',
    default: DeliveryStatus.Pending,
  })
  status!: DeliveryStatus;

  @Column({ name: 'http_status_code', type: 'smallint', nullable: true })
  httpStatusCode!: number | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({
    name: 'finished_at',
    type: 'timestamptz',
    nullable: true,
  })
  finishedAt!: Date | null;

  @ManyToOne(() => Event, (event) => event.deliveries, { onDelete: 'CASCADE' })
  event!: Relation<Event>;

  @ManyToOne(
    () => WebhookEndpoint,
    (webhookEndpoint) => webhookEndpoint.deliveries,
    { onDelete: 'RESTRICT' },
  )
  webhookEndpoint!: Relation<WebhookEndpoint>;
}
