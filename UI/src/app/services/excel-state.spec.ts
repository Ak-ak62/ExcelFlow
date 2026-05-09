import { TestBed } from '@angular/core/testing';

import { ExcelState } from './excel-state';

describe('ExcelState', () => {
  let service: ExcelState;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ExcelState);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
