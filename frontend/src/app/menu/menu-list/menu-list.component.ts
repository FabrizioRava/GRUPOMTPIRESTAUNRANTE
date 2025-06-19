import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MenuService, MenuItem } from '../../services/menu.service';


@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './menu-list.component.html',
  styleUrls: ['./menu-list.component.css']
})
export class MenuListComponent implements OnInit {
  menuItems: MenuItem[] = [];
  showAddForm: boolean = false;

  newMenuItem: MenuItem = {
    restaurantId: 0,
    name: '',
    description: '',
    price: 0,
    imageUrl: ''
  };

  constructor(private menuService: MenuService) {}

  ngOnInit(): void {
    this.loadMenuItems();
  }

  loadMenuItems() {
    this.menuService.getAllMenuItems().subscribe(items => {
      this.menuItems = items;
    });
  }

  toggleAddForm() {
    this.showAddForm = !this.showAddForm;
  }

  addMenuItem() {
    if (this.newMenuItem.name && this.newMenuItem.restaurantId) {
      this.menuService.createMenuItem(this.newMenuItem).subscribe(() => {
        this.loadMenuItems();
        this.resetForm();
        this.toggleAddForm();
      });
    }
  }

  resetForm() {
    this.newMenuItem = {
      restaurantId: 0,
      name: '',
      description: '',
      price: 0,
      imageUrl: ''
    };
  }
}
