import { Component, OnInit, Renderer2, ViewChild, ElementRef } from '@angular/core';
import { ROUTES } from '../sidebar/sidebar.component';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { OAuthService } from 'angular-oauth2-oidc';
import { Download, ThingService } from 'app/thing-bucket/services/thing.service';
import { Observable } from 'rxjs';


interface UserProfile {
  name: string;
  email: string;
}

@Component({
  moduleId: module.id,
  selector: 'app-navbar-cmp',
  templateUrl: 'navbar.component.html',
  styleUrls: ['./navbar.component.css']
})

export class NavbarComponent implements OnInit {
  private listTitles: any[];
  location: Location;
  private nativeElement: Node;
  private toggleButton;
  private sidebarVisible: boolean;
  public userProfile: UserProfile;

  private download$: Observable<Download>;
  private takeoutInProgress: boolean = false;


  public isCollapsed = true;
  @ViewChild('app-navbar-cmp', { static: false }) button;

  constructor(location: Location,
    private renderer: Renderer2,
    private element: ElementRef,
    private router: Router,
    private oauthService: OAuthService,
    private thingService: ThingService) {
    this.location = location;
    this.nativeElement = element.nativeElement;
    this.sidebarVisible = false;
  }

  ngOnInit() {
    this.listTitles = ROUTES.filter(listTitle => listTitle);
    const navbar: HTMLElement = this.element.nativeElement;
    this.toggleButton = navbar.getElementsByClassName('navbar-toggle')[0];
    this.router.events.subscribe((event) => {
      this.sidebarClose();
    });
    if (this.oauthService.hasValidAccessToken() && this.oauthService.hasValidIdToken()) {
      const claim: any = this.oauthService.getIdentityClaims()
      this.userProfile = {
        name: claim.name,
        email: claim.email
      }
    }
  }
  getTitle() {
    let titlee = this.location.prepareExternalUrl(this.location.path());
    if (titlee.charAt(0) === '#') {
      titlee = titlee.slice(1);
    }
    for (let item = 0; item < this.listTitles.length; item++) {
      if (this.listTitles[item].path === titlee) {
        return this.listTitles[item].title;
      }
    }
    return 'Dashboard';
  }
  sidebarToggle() {
    if (this.sidebarVisible === false) {
      this.sidebarOpen();
    } else {
      this.sidebarClose();
    }
  }
  sidebarOpen() {
    const toggleButton = this.toggleButton;
    const html = document.getElementsByTagName('html')[0];
    const mainPanel = <HTMLElement>document.getElementsByClassName('main-panel')[0];
    setTimeout(function () {
      toggleButton.classList.add('toggled');
    }, 500);

    html.classList.add('nav-open');
    if (window.innerWidth < 991) {
      mainPanel.style.position = 'fixed';
    }
    this.sidebarVisible = true;
  };
  sidebarClose() {
    const html = document.getElementsByTagName('html')[0];
    const mainPanel = <HTMLElement>document.getElementsByClassName('main-panel')[0];
    if (window.innerWidth < 991) {
      setTimeout(function () {
        mainPanel.style.position = '';
      }, 500);
    }
    this.toggleButton.classList.remove('toggled');
    this.sidebarVisible = false;
    html.classList.remove('nav-open');
  };
  collapse() {
    this.isCollapsed = !this.isCollapsed;
    const navbar = document.getElementsByTagName('nav')[0];
    if (!this.isCollapsed) {
      navbar.classList.remove('navbar-transparent');
      navbar.classList.add('bg-white');
    } else {
      navbar.classList.add('navbar-transparent');
      navbar.classList.remove('bg-white');
    }

  }
  logout() {
    this.oauthService.logOut();
    this.oauthService.revokeTokenAndLogout();
  }

  editProfile() {
    const win = window.open('https://dwd.tudelft.nl/profile', '_blank');
    win.focus();
  }

  takeout() {
    console.log('takeout')
    const spinner: HTMLElement = document.getElementById('nav-spinner')
    spinner.style.display = "block";
    if (!this.takeoutInProgress) {
      this.takeoutInProgress = true;
      this.download$ = this.thingService.takeout();
      this.download$.subscribe((value: Download) => {
        this.takeoutInProgress = false;
        spinner.style.display = "none";
        this.thingService.toast('Takeout ready.', 'success', 'nc-single-copy-04')
      }, (error: Error) => {
        this.takeoutInProgress = false;
        spinner.style.display = "none";
        this.thingService.toast('Takeout failed.', 'danger', 'nc-single-copy-04')
      })
    } else {
      console.log('ignoring takeout, already ongoing')
    }
  }
}
