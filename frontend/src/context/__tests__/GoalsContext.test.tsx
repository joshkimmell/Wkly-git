// React import not required in this test file
import { render } from '@testing-library/react';
import { GoalsProvider, useGoalsContext } from '../GoalsContext';

describe('GoalsContext basic behavior', () => {
  test('useGoalsContext throws outside provider', () => {
    // @ts-ignore - we expect a runtime throw
    expect(() => useGoalsContext()).toThrow();
  });

  test('GoalsProvider renders children and provides context', () => {
    const Child = () => {
      const ctx = useGoalsContext();
      return <div data-testid="len">{ctx.goals.length}</div>;
    };

    const { getByTestId } = render(
      <GoalsProvider>
        <Child />
      </GoalsProvider>
    );

    expect(getByTestId('len')).toBeDefined();
  });
});
