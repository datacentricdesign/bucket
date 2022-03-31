import { Component, OnInit } from '@angular/core';


export interface RouteInfo {
  path: string;
  title: string;
  icon: string;
  class: string;
}

const getStartedRoute = { path: '/get-started', title: 'Get Started', icon: 'nc-user-run', class: '' }
const tutorialsRoute = { path: '/tutorials', title: 'Tutorials', icon: 'nc-spaceship', class: '' }
const howToRoute = { path: '/how-to', title: 'How-To Guides', icon: 'nc-bullet-list-67', class: '' }
const technicalRefRoute = { path: '/references', title: 'Technical References', icon: 'nc-book-bookmark', class: '' }
const explanationRoute = { path: '/explanations', title: 'Background Info', icon: 'nc-single-copy-04', class: '' }

export const ROUTES: RouteInfo[] = [getStartedRoute, tutorialsRoute, howToRoute, technicalRefRoute, explanationRoute];

@Component({
  selector: 'app-public-doc',
  templateUrl: './public-doc.component.html',
  styleUrls: ['./public-doc.component.scss']
})
export class PublicDocComponent implements OnInit {

  public menuItems: any[];
  
  constructor() {

  }

  ngOnInit() {
    this.menuItems = ROUTES.filter(menuItem => menuItem);
  }
}
