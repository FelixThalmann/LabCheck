import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType({ description: 'Represents a laboratory setting' })
export class LabSettingModel {
  @Field(() => ID, { description: 'The unique key of the setting' })
  key: string;

  @Field({ description: 'The value of the setting' })
  value: string;

  @Field({ nullable: true, description: 'Optional notes for the setting' })
  notes?: string;

  @Field(() => Date, { description: 'Timestamp of creation' })
  createdAt: Date;

  @Field(() => Date, { description: 'Timestamp of last update' })
  updatedAt: Date;
} 