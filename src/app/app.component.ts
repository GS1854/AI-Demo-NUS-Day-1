import { CommonModule } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { LinkRecord, LinkService } from './link.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly api = inject(LinkService);

  url = signal('');
  links = signal<LinkRecord[]>([]);
  error = signal('');
  successUrl = signal('');
  isSubmitting = signal(false);

  ngOnInit(): void {
    void this.loadLinks();
  }

  async submit(): Promise<void> {
    const raw = this.url().trim();

    if (!raw) {
      this.error.set('Please paste a URL to shorten.');
      this.successUrl.set('');
      return;
    }

    try {
      const candidate = new URL(raw);
      if (candidate.protocol !== 'http:' && candidate.protocol !== 'https:') {
        throw new Error('Only http and https URLs are allowed.');
      }

      this.error.set('');
      this.isSubmitting.set(true);
      const created = await this.api.createLink(raw);
      this.successUrl.set(created.shortUrl);
      this.url.set('');
      await this.loadLinks();
    } catch (err) {
      this.successUrl.set('');
      this.error.set(this.getErrorMessage(err));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  async loadLinks(): Promise<void> {
    try {
      this.links.set(await this.api.listLinks());
    } catch {
      this.links.set([]);
    }
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return 'Something went wrong. Please try again.';
  }
}
