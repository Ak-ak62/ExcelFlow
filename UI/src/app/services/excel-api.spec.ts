import { TestBed } from '@angular/core/testing';

import { ExcelApi } from './excel-api';

describe('ExcelApi', () => {
  let service: ExcelApi;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExcelApi);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
