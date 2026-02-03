import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import UserQuotaSelector from '../components/UserQuotaSelector';
import { AllProvidersWrapperDefault } from './utils/testUtils';

vi.mock('axios');

// Inviter: user1,  Invitee:user1
const quotaData = [
    {
        "username": "user2",
        "parallel_quota": 50,
        "volume_quota": 180000, // 180000 / 100 = 1800
        "volume_used": 0,
        "disk_quota": 50000000, // 50 MB
        "disk_used": 0
    },
    {
        "username": "user1",
        "parallel_quota": 1,
        "volume_quota": 3600,   // 3600 / 100 = 36
        "volume_used": 0,
        "disk_quota": 1000000,  // 1 MB
        "disk_used": 0
    }
];

const mockSetQuotas = vi.fn();

const AllProvidersWrapper = ({ children }) => (
    <AllProvidersWrapperDefault options={{ username: "user2", roles: ["user"] }}>
        {children}
    </AllProvidersWrapperDefault>
);


describe('UserQuotaSelector', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        axios.get.mockImplementation((url, paramsRaw) => {
            let params
            if (paramsRaw != null) {
                ({ params } = paramsRaw)
            }
            switch (url) {
                case 'testserver/usage/quota':
                    if (params?.username === "user2") {
                        return Promise.resolve({
                            status: 200,
                            data: [{
                                "username": "user2",
                                "parallel_quota": 50,
                                "volume_quota": 180000, // 180000 / 100 = 1800
                                "volume_used": 0,
                                "disk_quota": 50000000, // 50 MB
                                "disk_used": 0
                            },
                            {
                                "username": "user1",
                                "parallel_quota": 1,
                                "volume_quota": 3600,   // 3600 / 100 = 36
                                "volume_used": 0,
                                "disk_quota": 1000000,  // 1 MB
                                "disk_used": 0
                            }]
                        })
                    } else if (params?.username === "admin") {
                        return Promise.resolve({
                            status: 200,
                            data: []
                        })
                    }
                    else {
                        return Promise.reject(new Error('not found'))
                    }
                default:
                    return Promise.reject(new Error('not found'))
            }
        });
    });

    it('renders UserQuotaSelector correctly', async () => {
        render(<UserQuotaSelector
            setQuotas={mockSetQuotas}
            quotas={{ parallel: null, volume: null, disk: null }}
            quotaData={[]}
            userToEdit="user1"
        />, { wrapper: AllProvidersWrapperDefault });
        await waitFor(() => screen.findByText(/Parallel Quota /));
    });

    it('displays the given quota data correctly for user1', async () => {
        const user1Quotas = {
            parallel: 1,
            volume: 3600,
            disk: 1000000
        };

        render(<UserQuotaSelector
            setQuotas={mockSetQuotas}
            quotas={user1Quotas}
            quotaData={quotaData}
            userToEdit="user1"
        />, { wrapper: AllProvidersWrapperDefault });

        await waitFor(() => screen.findByText(/Parallel Quota/));

        expect(screen.getByRole('spinbutton', { name: /parallel quota/i })).toHaveValue(1);
        expect(screen.getByRole('spinbutton', { name: /volume quota/i })).toHaveValue(36);
        expect(screen.getByRole('spinbutton', { name: /disk space quota/i })).toHaveValue(1);
    });

    it('calculates max quota based on the inviter (user1) when editing user2', async () => {
        render(<UserQuotaSelector
            setQuotas={mockSetQuotas}
            quotas={{ parallel: null, volume: null, disk: null }}
            quotaData={quotaData}
            userToEdit="user2"
        />, { wrapper: AllProvidersWrapperDefault });

        await waitFor(() => screen.findByText(/Parallel Quota/));

        const parallelInput = screen.getByRole('spinbutton', { name: /parallel quota/i });
        expect(parallelInput).toHaveAttribute('max', '1');

        const volumeInput = screen.getByRole('spinbutton', { name: /volume quota/i });
        expect(volumeInput).toHaveAttribute('max', '36');

        const diskInput = screen.getByRole('spinbutton', { name: /disk space quota/i });
        expect(diskInput).toHaveAttribute('max', '1');

    });

    it('shows 0/negative remaining if the Inviter (user1) has used all their quota', async () => {

        const inviterExhaustedData = [
            {
                "username": "user2",
                "parallel_quota": 50,
                "volume_quota": 180000,
                "volume_used": 0,
                "disk_quota": 50000000,
                "disk_used": 0
            },
            {
                "username": "user1", // Inviter
                "parallel_quota": 1,
                "volume_quota": 36,
                "volume_used": 36.19153666496277, // Inviter is full!
                "disk_quota": 1000000,
                "disk_used": 8760
            }
        ];

        render(<UserQuotaSelector
            setQuotas={mockSetQuotas}
            quotas={{ parallel: 50, volume: 180000, disk: 50000000 }}
            quotaData={inviterExhaustedData}
            userToEdit="user2" // Editing the invitee
        />, { wrapper: AllProvidersWrapperDefault });

        await waitFor(() => screen.findByText(/Parallel Quota/));

        const volumeHint = screen.getByText((content, element) => {
            return element.tagName.toLowerCase() === 'span' &&
                content.includes('remaining') &&
                // Regex for 0.00 or negative (-$0.00)
                (/remaining:\s*0(\.00)?/.test(content) || /remaining:\s*-\$/.test(content)) &&
                // MAX should be user1's limit (36 -> $0.36)
                content.includes('max: $0.36');
        });
        expect(volumeHint).toBeInTheDocument();
    });

    it('shows 0/negative remaining if the Invitee (user2) has used all their own quota', async () => {
        const inviteeExhaustedData = [
            {
                "username": "user2", // Invitee
                "parallel_quota": 50,
                "volume_quota": 180000,
                "volume_used": 180005, // Used > Quota
                "disk_quota": 50000000,
                "disk_used": 0
            },
            {
                "username": "user1", // Inviter
                "parallel_quota": 1000000,
                "volume_quota": 1000000,
                "volume_used": 0,          // Inviter has space
                "disk_quota": 1000000,
                "disk_used": 0
            }
        ];

        render(<UserQuotaSelector
            setQuotas={mockSetQuotas}
            quotas={{ parallel: 50, volume: 180000, disk: 50000000 }}
            quotaData={inviteeExhaustedData}
            userToEdit="user2" // Editing the invitee
        />, { wrapper: AllProvidersWrapperDefault });

        await waitFor(() => screen.findByText(/Parallel Quota/));

        const volumeHint = screen.getByText((content, element) => {
            return element.tagName.toLowerCase() === 'span' &&
                content.includes('remaining') &&
                (/remaining:\s*0(\.00)?/.test(content) || /remaining:\s*-\$/.test(content));
        });
        expect(volumeHint).toBeInTheDocument();
    });

    it('if called from inviterForm fetch the data correctly', async () => {
        render(<UserQuotaSelector
            setQuotas={mockSetQuotas}
            quotas={null}
            quotaData={null}
            userToEdit={null}
        />, { wrapper: AllProvidersWrapper });

        await waitFor(() => screen.findByText(/Parallel Quota/));

        const parallelInput = screen.getByRole('spinbutton', { name: /parallel quota/i });
        expect(parallelInput).toHaveAttribute('max', '1');

        const volumeInput = screen.getByRole('spinbutton', { name: /volume quota/i });
        expect(volumeInput).toHaveAttribute('max', '36');

        const diskInput = screen.getByRole('spinbutton', { name: /disk space quota/i });
        expect(diskInput).toHaveAttribute('max', '1');
    });
});
