import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from '../../users/entities/user.entity.js';
import { WebhookEndpoint } from '../../webhook-endpoints/entities/webhook-endpoint.entity.js';
import { Event } from '../../events/entities/event.entity.js';

@Entity({ name: 'projects' })
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('IDX_projects_user_id')
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @ManyToOne(() => User, (user) => user.projects, { onDelete: 'RESTRICT' })
  user!: Relation<User>;

  @OneToMany(
    () => WebhookEndpoint,
    (webhookEndpoint) => webhookEndpoint.project,
  )
  webhookEndpoints!: Relation<WebhookEndpoint[]>;

  @OneToMany(() => Event, (event) => event.project)
  events!: Relation<Event[]>;
}
