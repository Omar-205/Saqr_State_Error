import { NonNullAssert } from '@angular/compiler';
import { AfterViewInit, Component, computed, ElementRef, EventEmitter, OnDestroy, Output, Signal, signal, ViewChild } from '@angular/core';

import cytoscape from 'cytoscape';
import { elementAt, every } from 'rxjs';

@Component({
	selector: 'app-graph',
	imports: [],
	standalone: true,
	templateUrl: './graph.html',
	styleUrl: './graph.css',
})
export class Graph implements AfterViewInit, OnDestroy {
	private cy= signal<cytoscape.Core | undefined>(undefined)

	@Output() calculate = new EventEmitter()

	ngAfterViewInit(): void {
		
		this.cy.set( cytoscape({
			container: document.getElementById('cy'),
			elements: [
				// Define nodes
				{ data: { id: 'A', label: 'Input' } },
				{ data: { id: 'B', label: 'Task 1' } },
				{ data: { id: 'C', label: 'Task 2' } },
				{ data: { id: 'D', label: 'Output' } },
				// Define edges (directed)
				{ data: { id: 'AB', source: 'A', target: 'B' } },
				{ data: { id: 'AC', source: 'A', target: 'C' } },
				{ data: { id: 'BD', source: 'B', target: 'D' } },
				{ data: { id: 'BB', source: 'B', target: 'B' } },
				{ data: { id: 'CD', source: 'C', target: 'D', value: 2 } }
			],
			style: [
				{
					selector: 'node',
					style: {
						'label': 'data(label)',
						'background-color': 'white',
						'text-background-color': 'black',
						'width': '60px',
						'height': '60px',
						'text-valign': 'center',
						'color': 'black',
						"border-color": 'black',
						'border-width': '2',
						'font-size': '16px'
					}
				},
				{
					selector: 'edge',
					style: {
						'width': 2,
						'line-color': 'black',
						'target-arrow-color': 'black',
						'target-arrow-shape': 'triangle',
						'curve-style': 'bezier',
						'loop-direction': '0',
						'loop-sweep': '-250',
						
					}
				}
			],
			layout: {
				name: 'grid',
				rows: 1,
				cols: 4,
				fit: true,
				padding: 30
			}
		}));

		this.cy()?.on('click', 'node', (event: any) => {
			const node = event.target;
			console.log('clicked on a node');
			console.log('ev: ');
			console.log(event);
		})
		this.cy()?.on('tap', (event: any) => {
			const target = event.target
			if (target == this.cy()) {
				console.log('clicked on the background');
			} else {
				console.log('clicked on something else');
				console.log(target);
			}
		})
		this.cy()?.on('dbltap', (event: any) => {
			const target = event.target
			if (target == this.cy()) {
				console.log('clicked on the background twice');
				console.log(event.position);
				
				this.cy()?.add({ data: { id: 'Z', label: 'Input'}, position: event.position})
			} else {
				console.log('clicked on something else twice');
				console.log(target);
			}
		})
		// don't forget one()
		console.log(this.cy()?.nodes().map((n: any) => n._private.data));
		console.log(this.cy()?.edges().map((n: any) => n._private.data));
		
		
	}
	nodes = computed(() => this.cy()?.nodes().map((n: any) => n._private.data))
	edges = computed(() => this.cy()?.edges().map((n: any) => n._private.data))
	ngOnDestroy(): void {
		if (this.cy) {
			this.cy()?.destroy();
		}
	}
}

