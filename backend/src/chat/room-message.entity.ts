import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Participant } from '../participants/participant.entity';
import { Room } from '../rooms/room.entity';

@Entity({ name: 'room_messages' })
export class RoomMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Index()
  @Column({ name: 'participant_id', type: 'uuid' })
  participantId: string;

  @ManyToOne(() => Participant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'participant_id' })
  participant: Participant;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ type: 'varchar', length: 500 })
  content: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
