export type ChannelType = 'Pixera' | 'Vizrt' | 'Unreal' | 'Web';

export interface Channel {
  id: string;
  name: string;
  type: ChannelType;
  description: string;
  createdAt: string;
  updatedAt: string;
}
