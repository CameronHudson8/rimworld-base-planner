import { render, screen } from '@testing-library/react';
import { AppView } from './app-view';

test('renders learn react link', () => {
  render(<AppView />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
