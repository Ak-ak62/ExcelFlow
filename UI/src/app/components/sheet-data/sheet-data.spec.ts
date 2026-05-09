import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SheetData } from './sheet-data';

describe('SheetData', () => {
  let component: SheetData;
  let fixture: ComponentFixture<SheetData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SheetData],
    }).compileComponents();

    fixture = TestBed.createComponent(SheetData);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
