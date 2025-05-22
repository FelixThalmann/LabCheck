import { Test, TestingModule } from '@nestjs/testing';
import { DoorService } from './door.service';

describe('DoorService', () => {
  let service: DoorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DoorService],
    }).compile();

    service = module.get<DoorService>(DoorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
