import { Test, TestingModule } from '@nestjs/testing';
import { MqttIngestionService } from './mqtt-ingestion.service';

describe('MqttIngestionService', () => {
  let service: MqttIngestionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MqttIngestionService],
    }).compile();

    service = module.get<MqttIngestionService>(MqttIngestionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
