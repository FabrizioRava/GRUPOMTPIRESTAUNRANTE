import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from './core/sidebar/sidebar.component';
import { AuthService } from './services/auth.service';
import { filter, Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'pedidos-ya';
  isSidebarOpen = false;
  showAppHeaderAndSidebar: boolean = true;
  private routerSubscription: Subscription | undefined; 

  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const isAuthRoute = event.urlAfterRedirects.includes('/auth/login') || event.urlAfterRedirects.includes('/auth/register');
      this.showAppHeaderAndSidebar = !isAuthRoute;
      if (isAuthRoute) {
        this.isSidebarOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  closeSidebar() {
    this.isSidebarOpen = false;
  }

  logout() {
    this.authService.logout();
    this.isSidebarOpen = false; 
  }
}