import { Injectable } from '@nestjs/common';

export interface MockProperty {
  id: string;
  name: string;
  address: string;
  basePrice: number;
  image: string;
}

@Injectable()
export class PropertiesService {
  findAll(): MockProperty[] {
    return [
      {
        id: '1',
        name: 'NoWayHome Central Hotel',
        address: '12 Nguyen Hue, District 1, Ho Chi Minh City',
        basePrice: 1200000,
        image: 'https://example.com/images/nowayhome-central.jpg',
      },
      {
        id: '2',
        name: 'Saigon Riverside Homestay',
        address: '88 Ton That Thuyet, District 4, Ho Chi Minh City',
        basePrice: 750000,
        image: 'https://example.com/images/saigon-riverside.jpg',
      },
    ];
  }
}
