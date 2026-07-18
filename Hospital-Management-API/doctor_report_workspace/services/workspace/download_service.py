"""DownloadService — secure download orchestration."""


class DownloadService:
    """Produces secure download redirects or signed URLs."""

    def get_download_url(self, *, report_id, artifact_id, scope):
        raise NotImplementedError("Milestone 0 scaffold — not implemented yet.")
