import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import PasswordInput from './PasswordInput.jsx';

describe('PasswordInput', () => {
  it('starts masked and toggles to plain text on click', async () => {
    const user = userEvent.setup();
    render(<PasswordInput id="pw" value="secret" onChange={() => {}} />);

    const input = document.getElementById('pw');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Показать пароль' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Скрыть пароль' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Скрыть пароль' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('applies the className prop to the wrapper, not the input', () => {
    render(<PasswordInput id="pw" className="password-tight" value="" onChange={() => {}} />);

    const input = document.getElementById('pw');
    expect(input.className).not.toContain('password-tight');
    expect(input.parentElement).toHaveClass('password-input-wrap', 'password-tight');
  });

  it('does not steal tab order — the toggle button is not focusable via Tab', () => {
    render(<PasswordInput id="pw" value="" onChange={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1');
  });
});
