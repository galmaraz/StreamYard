import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Room } from '../rooms/room.entity';

export type ParticipantRole = 'participant' | 'spectator';

@Entity({ name: 'participants' })
export class Participant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'room_id', type: 'uuid' })
  roomId: string;

  @ManyToOne(() => Room, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'room_id' })
  room: Room;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'display_name' })
  displayName: string;

  @Column({ name: 'participant_role', default: 'participant' })
  participantRole: ParticipantRole;

  @Column({ name: 'socket_id', nullable: true, type: 'varchar' })
  socketId: string | null;

  @Column({ name: 'mic_enabled', default: true })
  micEnabled: boolean;

  @Column({ name: 'camera_enabled', default: true })
  cameraEnabled: boolean;

  @Column({ name: 'hand_raised', default: false })
  handRaised: boolean;

  @CreateDateColumn({ name: 'joined_at' })
  joinedAt: Date;

  @Column({ name: 'left_at', nullable: true, type: 'timestamptz' })
  leftAt: Date | null;
}
