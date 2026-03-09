import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom'
import userEvent from '@testing-library/user-event';
import { AllProvidersWrapperDefault } from './utils/testUtils'

import JobSubmissionForm from '../components/JobSubmissionForm'
import axios from 'axios';

vi.mock('axios');

// Mock FileDropZone to render a simple file input so we can easily test file uploads
vi.mock('../components/FileDropZone', () => ({
    __esModule: true,
    default: ({ onDrop, label, multiple }) => (
        <div>
            <label htmlFor={`mock-dropzone-${label}`}>{label}</label>
            <input
                id={`mock-dropzone-${label}`}
                type="file"
                multiple={multiple}
                onChange={(e) => onDrop(Array.from(e.target.files))}
            />
        </div>
    )
}));

describe('JobSubmissionForm', () => {

    let user;

    beforeEach(() => {
        vi.clearAllMocks();
        user = userEvent.setup();

        axios.get.mockImplementation((url) => {
            switch (url) {
                case 'testserver/namespaces/':
                    return Promise.resolve({
                        status: 200, data: [{
                            "name": "test_namespace",
                            "permissions": [
                                {
                                    "username": "admin",
                                    "permission": 7
                                }
                            ],
                            "disk_quota": null
                        }]
                    })
                case 'testserver/usage/quota':
                    return Promise.resolve({ status: 200, data: [] })
                case 'testserver/usage/pools/admin':
                    return Promise.resolve({
                        status: 200, data: {
                            "instance_pools_available": []
                        }
                    })
                case 'testserver/usage/instances/admin':
                    return Promise.resolve({
                        status: 200, data: {
                            "instances_inherited_from": null,
                            "instances_available": [{
                                "label": "test",
                                "cpu_request": 1,
                                "memory_request": 100,
                                "workspace_request": 100,
                                "node_selectors": [],
                                "tolerations": [],
                                "multiplier": 1,
                                "multiplier_idle": 1
                            }]
                        }
                    })
                case 'testserver/usage/instances/admin/default':
                    return Promise.resolve({
                        status: 200, data: {
                            "default_instance": {
                                "label": "TestInstance",
                                "resource_type": "instance"
                            },
                            "default_inherited_from": "admin"
                        }
                    })
                case 'testserver/namespaces/test_namespace':
                    return Promise.resolve({
                        status: 200, data: [{ name: "my_registered_model.zip" }]
                    })
                default:
                    return Promise.reject(new Error('not found'))
            }
        })
    })

    it('renders JobSubmissionForm correctly', async () => {
        render(<JobSubmissionForm />, {
            wrapper: AllProvidersWrapperDefault
        });
        await waitFor(() => screen.findByText(/Use raw resource requests?/));
    });

    it('uses v1/jobs/ endpoint when is_saas and use_brokerv2 are false', async () => {
        axios.post.mockResolvedValue({ data: {} });

        render(<JobSubmissionForm />, {
            wrapper: AllProvidersWrapperDefault
        });

        await waitFor(() => screen.findByText(/Submit Job/));

        // Use the registered model to bypass the need to upload a model file
        const useRegisteredCheckbox = screen.getByLabelText(/Use a Registered Model\?/i);
        await user.click(useRegisteredCheckbox);

        const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('testserver/jobs/', expect.any(FormData), expect.any(Object));
        });
    });

    it('uses the /v2/jobs/ endpoint when is_saas and use_brokerv2 are true', async () => {
        axios.post.mockResolvedValue({ data: {} });

        render(<JobSubmissionForm />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ is_saas: true, use_brokerv2: true }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });

        await waitFor(() => screen.findByText(/Submit Job/));

        const useRegisteredCheckbox = screen.getByLabelText(/Use a Registered Model\?/i);
        await user.click(useRegisteredCheckbox);

        const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('testserver/v2/jobs/', expect.any(FormData), expect.any(Object));
        });
    });

    it('uses v1/jobs/ endpoint when is_saas is true and use_brokerv2 is false', async () => {
        axios.post.mockResolvedValue({ data: {} });

        render(<JobSubmissionForm />, {
            wrapper: ({ children }) => (
                <AllProvidersWrapperDefault options={{ is_saas: true, use_brokerv2: false }}>
                    {children}
                </AllProvidersWrapperDefault>
            )
        });

        await waitFor(() => screen.findByText(/Submit Job/));

        // Use the registered model to bypass the need to upload a model file
        const useRegisteredCheckbox = screen.getByLabelText(/Use a Registered Model\?/i);
        await user.click(useRegisteredCheckbox);

        const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('testserver/jobs/', expect.any(FormData), expect.any(Object));
        });
    });

    it('uses the /hypercube/ endpoint when newHcJob is true', async () => {
        axios.post.mockResolvedValue({ data: {} });

        render(<JobSubmissionForm newHcJob={true} />, {
            wrapper: AllProvidersWrapperDefault
        });

        await waitFor(() => screen.findByText(/Submit Job/));

        const useRegisteredCheckbox = screen.getByLabelText(/Use a Registered Model\?/i);
        await user.click(useRegisteredCheckbox);

        // Hypercube jobs strictly require an hc.json file to be uploaded before submission
        const hcInput = screen.getByLabelText(/Drop Hypercube description file here/i);
        const hcFile = new File(['{"hypercube": true}'], 'hc.json', { type: 'application/json' });
        await user.upload(hcInput, hcFile);

        const submitBtn = screen.getByRole('button', { name: /Submit Job/i });
        await user.click(submitBtn);

        await waitFor(() => {
            expect(axios.post).toHaveBeenCalledWith('testserver/hypercube/', expect.any(FormData), expect.any(Object));
        });
    });

})
