export interface GroupStudent {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
}

export interface GroupMember {
  id: string;
  groupId: string;
  studentId: string;
  joinedAt: string;
  student: GroupStudent;
}

export interface StudentGroup {
  id: string;
  name: string;
  leaderId: string;
  createdAt: string;
  leader: GroupStudent;
  members: GroupMember[];
}

export type AvailableStudent = GroupStudent;
