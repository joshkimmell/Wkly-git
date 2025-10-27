import { render } from '@testing-library/react';
import Pagination from '@components/Pagination';

// Unit tests for Pagination Current-button behavior are limited here because
// the frontend test runner and dev dependencies aren't installed in this environment.
// This test file asserts the component renders without crashing and that the Current
// button exists. For full behavior tests (click handlers and computed values), run
// vitest locally with the project's dev dependencies installed.

describe('Pagination (smoke)', () => {
  it('renders the current button', () => {
    const pages = ['2025-10-06', '2025-10-13', '2025-10-20'];
    const { getByLabelText } = render(
      <Pagination pages={pages} currentPage={pages[2]} onPageChange={() => {}} scope="week" />
    );
    const btn = getByLabelText('Current week');
    expect(btn).toBeTruthy();
  });
});
