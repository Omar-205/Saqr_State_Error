import { TestBed } from '@angular/core/testing';

import { MasonSolver } from './mason-solver';

describe('MasonSolver', () => {
  let service: MasonSolver;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MasonSolver);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
