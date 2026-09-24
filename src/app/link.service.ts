import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

export interface LinkRecord {
  code: string;
  url: string;
  shortUrl: string;
  hits: number;
  createdAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class LinkService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000';

  createLink(url: string) {
    return firstValueFrom(this.http.post<LinkRecord>(`${this.baseUrl}/api/links`, { url }));
  }

  listLinks() {
    return firstValueFrom(this.http.get<LinkRecord[]>(`${this.baseUrl}/api/links`));
  }
}
