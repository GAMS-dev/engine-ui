import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom'

import { UserSettingsContext } from "../components/UserSettingsContext";
import { ServerInfoContext } from "../ServerInfoContext";
import { AuthContext } from "../AuthContext";
import UserSettingsForm from '../components/UserSettingsForm';

const RouterWrapper = (options) => {
    const mulitplierUnit = options?.mulitplierUnit == null ? 'mults' : options.mulitplierUnit;
    const tablePageLength = options?.tablePageLength == null ? '10' : options.tablePageLength;

    return ({ children }) => (
        <MemoryRouter>
            <AuthContext.Provider value={[{ server: "http://localhost" }]}>
                <ServerInfoContext.Provider value={[{}, () => { }]}>
                    <UserSettingsContext.Provider value={[{
                        mulitplierUnit: mulitplierUnit,
                        tablePageLength: tablePageLength
                    }, () => { }]}>
                        {children}
                    </UserSettingsContext.Provider>
                </ServerInfoContext.Provider>
            </AuthContext.Provider>
        </MemoryRouter >)
};

describe('UserSettingsForm', () => {
    it('renders UserSettingsForm', () => {
        render(<UserSettingsForm />, {
            wrapper: RouterWrapper()
        });
    });

    it('shows correct options for multiplier unit and table page length', async () => {
        render(<UserSettingsForm />, {
            wrapper: RouterWrapper()
        });

        fireEvent.keyDown(document.getElementById('selectMulitplierUnit'), { key: 'ArrowDown' });
        expect(screen.queryAllByText('mults')).toHaveLength(2);
        expect(screen.queryAllByText('multh')).toHaveLength(1);

        fireEvent.keyDown(document.getElementById('tablePageLength'), { key: 'ArrowDown' });
        expect(screen.queryAllByText('10')).toHaveLength(2);
        expect(screen.queryAllByText('20')).toHaveLength(1);
    });

    it('userSettingsContext is correctly updated when settings change', async () => {
        render(<UserSettingsForm />, {
            wrapper: RouterWrapper()
        });

        fireEvent.keyDown(document.getElementById('selectMulitplierUnit'), { key: 'ArrowDown' });
        await waitFor(() => screen.getByText('multh'));
        fireEvent.click(screen.getByText('multh'));
        expect(screen.queryAllByText('mults')).toHaveLength(0);
        expect(screen.queryAllByText('multh')).toHaveLength(1);

        fireEvent.keyDown(document.getElementById('tablePageLength'), { key: 'ArrowDown' });
        await waitFor(() => screen.getByText('20'));
        fireEvent.click(screen.getByText('20'));
        expect(screen.queryAllByText('10')).toHaveLength(0);
        expect(screen.queryAllByText('20')).toHaveLength(1);
    });

});
