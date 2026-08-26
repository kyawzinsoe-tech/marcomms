import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { TokenModal } from '../components/TokenModal';

describe('Modal Form Validation Component Test Suite', () => {
  describe('SubscriptionModal Form Validation', () => {
    it('blocks submission and shows errors when required fields are empty', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <SubscriptionModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
          subscription={null}
        />
      );

      const form = screen.getByRole('dialog').querySelector('form');
      fireEvent.submit(form);

      expect(screen.getByText('Product name is required.')).toBeDefined();
      expect(screen.getByText('Tool / Service category is required.')).toBeDefined();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('blocks submission and shows error when monthly cost is negative', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <SubscriptionModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
          subscription={null}
        />
      );

      const productInput = screen.getByLabelText(/Product Name/i);
      const toolInput = screen.getByLabelText(/Tool \/ Service/i);
      const costInput = screen.getByLabelText(/^Cost \(USD\)/i);

      fireEvent.change(productInput, { target: { value: 'Midjourney Pro' } });
      fireEvent.change(toolInput, { target: { value: 'AI Generative' } });
      fireEvent.change(costInput, { target: { value: '-45' } });

      const form = screen.getByRole('dialog').querySelector('form');
      fireEvent.submit(form);

      expect(screen.getByText('Monthly cost must be a positive number.')).toBeDefined();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('submits successfully when valid subscription data is entered', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <SubscriptionModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
          subscription={null}
        />
      );

      const productInput = screen.getByLabelText(/Product Name/i);
      const toolInput = screen.getByLabelText(/Tool \/ Service/i);
      const costInput = screen.getByLabelText(/^Cost \(USD\)/i);

      fireEvent.change(productInput, { target: { value: 'ChatGPT Plus' } });
      fireEvent.change(toolInput, { target: { value: 'AI Text' } });
      fireEvent.change(costInput, { target: { value: '20' } });

      const form = screen.getByRole('dialog').querySelector('form');
      fireEvent.submit(form);

      expect(handleSave).toHaveBeenCalled();
    });
  });

  describe('TokenModal Form Validation', () => {
    it('blocks submission when required fields are missing', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <TokenModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
          tokenEntry={null}
          defaultMonth="2026-08"
        />
      );

      const form = screen.getByRole('dialog').querySelector('form');
      fireEvent.submit(form);

      expect(screen.getByText('Account or email is required.')).toBeDefined();
      expect(screen.getByText('Project or usage description is required.')).toBeDefined();
      expect(screen.getByText('Tokens used must be a positive number greater than 0.')).toBeDefined();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('blocks submission when token cost is negative', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <TokenModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
          tokenEntry={null}
          defaultMonth="2026-08"
        />
      );

      const accountInput = screen.getByLabelText(/Account \/ Email/i);
      const projectInput = screen.getByLabelText(/Project \/ Campaign/i);
      const tokensInput = screen.getByLabelText(/Tokens Used/i);
      const costInput = screen.getByLabelText(/Estimated Cost/i);

      fireEvent.change(accountInput, { target: { value: 'user@kbzbank.com' } });
      fireEvent.change(projectInput, { target: { value: 'Campaign Visuals' } });
      fireEvent.change(tokensInput, { target: { value: '5000' } });
      fireEvent.change(costInput, { target: { value: '-10' } });

      const form = screen.getByRole('dialog').querySelector('form');
      fireEvent.submit(form);

      expect(screen.getByText('Token cost must be a positive number.')).toBeDefined();
      expect(handleSave).not.toHaveBeenCalled();
    });

    it('submits successfully when valid token usage data is entered', async () => {
      const handleSave = vi.fn();
      const handleClose = vi.fn();

      render(
        <TokenModal
          isOpen={true}
          onClose={handleClose}
          onSave={handleSave}
          tokenEntry={null}
          defaultMonth="2026-08"
        />
      );

      const accountInput = screen.getByLabelText(/Account \/ Email/i);
      const projectInput = screen.getByLabelText(/Project \/ Campaign/i);
      const tokensInput = screen.getByLabelText(/Tokens Used/i);
      const costInput = screen.getByLabelText(/Estimated Cost/i);

      fireEvent.change(accountInput, { target: { value: 'designer@kbzbank.com' } });
      fireEvent.change(projectInput, { target: { value: 'App Icon Redesign' } });
      fireEvent.change(tokensInput, { target: { value: '10000' } });
      fireEvent.change(costInput, { target: { value: '50' } });

      const form = screen.getByRole('dialog').querySelector('form');
      fireEvent.submit(form);

      expect(handleSave).toHaveBeenCalled();
    });
  });
});
