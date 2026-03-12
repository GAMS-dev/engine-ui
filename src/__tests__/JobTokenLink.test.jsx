import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { JobTokenLink } from "../components/JobTokenLink";

describe("JobTokenLink Component", () => {
    it("renders a standard job link when type is not hypercube_result", () => {
        render(
            <MemoryRouter>
                <JobTokenLink name="abc-123" type="standard_job" />
            </MemoryRouter>
        );

        // Find the link by its text
        const linkElement = screen.getByRole("link", { name: "abc-123" });

        expect(linkElement).toBeInTheDocument();
        expect(linkElement).toHaveAttribute("href", "/jobs/abc-123");

        // Ensure the "HC" badge does NOT render
        expect(screen.queryByText("HC")).not.toBeInTheDocument();
    });

    it("renders a hypercube link with an HC badge when type is hypercube_result", () => {
        render(
            <MemoryRouter>
                <JobTokenLink name="xyz-789" type="hypercube_result" />
            </MemoryRouter>
        );

        // Since the text is split between the name and the badge, we just get the link role
        const linkElement = screen.getByRole("link");

        expect(linkElement).toBeInTheDocument();
        expect(linkElement).toHaveAttribute("href", "/jobs/hc:xyz-789");
        expect(linkElement).toHaveTextContent("xyz-789");

        // Ensure the "HC" badge DOES render
        const badgeElement = screen.getByText("HC");
        expect(badgeElement).toBeInTheDocument();
        expect(badgeElement).toHaveClass("badge", "bg-primary");
    });

    it("wraps the content in a span with the font-monospace class", () => {
        const { container } = render(
            <MemoryRouter>
                <JobTokenLink name="mono-test" type="regular" />
            </MemoryRouter>
        );

        // Check if the outer container has the correct bootstrap class
        const spanElement = container.querySelector("span.font-monospace");
        expect(spanElement).toBeInTheDocument();
    });
});
