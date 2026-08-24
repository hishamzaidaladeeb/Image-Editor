import { render, screen } from "@testing-library/react";
import { ProcessingComparison } from "@/components/ProcessingComparison";

describe("ProcessingComparison", () => {
  it("keeps original and processed images visible in equal contain frames", () => {
    render(
      <ProcessingComparison
        title="Processing comparison"
        processing
        processingLabel="Processing…"
        items={[
          { label: "Original Image", url: "/original.png" },
          { label: "Processed Image", url: "/processed.png" },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Processing comparison" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Original Image" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Processed Image" })).toBeInTheDocument();
    expect(screen.getAllByRole("img")).toHaveLength(2);
    expect(screen.getByRole("status")).toHaveTextContent("Processing…");
  });

  it("renders three stable cards for image blending", () => {
    render(
      <ProcessingComparison
        title="Blend comparison"
        processingLabel="Processing…"
        items={[
          { label: "Image 1", url: "/one.png" },
          { label: "Image 2", url: "/two.png" },
          { label: "Merged Result", url: "/merged.png" },
        ]}
      />,
    );

    expect(screen.getAllByRole("img")).toHaveLength(3);
    expect(screen.getByRole("heading", { name: "Image 1" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Image 2" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Merged Result" })).toBeInTheDocument();
  });
});
