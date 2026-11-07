import CreatePaperWizard from "@/components/CreatePaperWizard";

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const sp = await searchParams;
  const id = typeof sp.id === "string" ? Number(sp.id) : null;
  const template = typeof sp.template === "string" ? Number(sp.template) : null;
  const step = typeof sp.step === "string" ? Number(sp.step) : 1;
  return <CreatePaperWizard key={`${id ?? "new"}-${template ?? ""}`} paperId={id} templateId={template} initialStep={step} />;
}
