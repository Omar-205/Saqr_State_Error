import { NonNullAssert } from '@angular/compiler';
import { AfterViewInit, Component, computed, ElementRef, EventEmitter, OnDestroy, Output, Signal, signal, ViewChild } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

import cytoscape from 'cytoscape';
import { elementAt, every, single } from 'rxjs';

@Component({
	selector: 'app-graph',
	imports: [FormField],
	standalone: true,
	templateUrl: './graph.html',
	styleUrl: './graph.css',
})
export class Graph implements AfterViewInit, OnDestroy {

	private cy= signal<cytoscape.Core | undefined>(undefined)

	@Output() calculate = new EventEmitter()

	ngAfterViewInit(): void {
		this.initializeCytoscape()
		this.initializeEvents()
	}
	initializeEvents = ()=> {
		document.addEventListener('keydown', (event) => {
		if (event.key == 'Shift' && event.shiftKey) {
			this.shift.set(true)
			console.log('shift set');
		}
		});
		document.addEventListener('keyup', (event) => {
		if (event.key == 'Shift') {
			this.shift.set(false)
			console.log('shift unset');
		}
		});
	}
	nodes = computed(() => this.cy()?.nodes().map((n: any) => n._private.data))
	edges = computed(() => this.cy()?.edges().map((n: any) => n._private.data))
	ngOnDestroy(): void {
		if (this.cy) {
			this.cy()?.destroy();
		}
	}
	shift = signal(false);
	
	initializeCytoscape = () => {
		this.cy.set( cytoscape({
			container: document.getElementById('cy'),
			elements: [
				// Define nodes
				{ data: { id: 'input', label: 'input' } },
				{ data: { id: 'output', label: 'output' } },
				// Define edges (directed)
/* 				{ data: { id: 'AB', source: 'A', target: 'B', weight: 2 } },
				{ data: { id: 'AC', source: 'A', target: 'C', weight: 2 } },
				{ data: { id: 'BD', source: 'B', target: 'D', weight: 2 } },
				{ data: { id: 'BB', source: 'B', target: 'B', weight: 2 } },
				{ data: { id: 'CD', source: 'C', target: 'D', weight: 2 } } */
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
						'label': 'data(weight)',
						'text-margin-y': -10
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


		this.cy()?.on('tap', (event: any) => {
			const target = event.target
			if (target == this.cy()) {
				console.log('clicked on the background');
				if(this.selected())
					this.selected().style("background-color", '#ffffff')
				this.selected.set(null)

			} else {
				console.log('clicked on something else');
				
				if(target.isNode()) {
					if(!this.shift() || !this.selected() || this.selected().isEdge()) {
						
						if(this.selected()) {
							if(this.selected().isNode())
								this.selected().style("background-color", '#ffffff')
							else
								this.selected().style("line-color", 'black')
						}
						target.style("background-color", '#90EE90')
						this.selected.set( target);
					}else {
						//{ data: { id: 'CD', source: 'C', target: 'D', weight: 2 } }
						this.cy()?.add({ data: { id: generateUUID(), source: this.selected().id(), target: target.id(), weight: this.inputWeight() } })
					}
				}else {
					// edges
					// 'line-color': 'black'						
					if(this.selected()) {
						if(this.selected().isNode())
							this.selected().style("background-color", '#ffffff')
						else
							this.selected().style("line-color", 'black')
					}
					target.style("line-color", '#90EE90')
					this.selected.set( target);
				}
			}
		})
		this.cy()?.on('dbltap', (event: any) => {
			const target = event.target
			if (target == this.cy()) {
				console.log('clicked on the background twice');
				
				this.cy()?.add({ data: { id: generateUUID(), label: this.getNextLabel()}, position: event.position})
			} else {
				console.log('clicked on something else twice');
				console.log(target.label());
			}
		})
		// don't forget one()
		// console.log(this.cy()?.nodes().map((n: any) => n._private.data));
		// console.log(this.cy()?.edges().map((n: any) => n._private.data));
		
	}
	selected = signal<any>(null);
	inputWeight = signal(0)
	inputChangeHandler = ($event: any)=> {
		this.inputWeight.set($event.target.value)
		// console.log($event.target.value);
	}
	labels: Record<number, boolean> = {}
	getNextLabel = (): number=> {
		let i = 1
		for(;i<1e10; i++) {
			if(!this.labels[i])
				break
		}
		this.labels[i] = true
		return i
	}

	handleDelete = () => {
		if(!this.selected())
			return
		const label = this.selected()._private.data.label
		if(label == 'input' || label == 'output') {
			alert(`You can't delete the ${label} node!!!`)
			return
		}
		this.cy()?.remove(this.selected())
		console.log(this.selected());
		
		this.labels[label] = false
		this.selected.set(null)
		/* console.log(this.cy()?.nodes().map((n: any) => n._private.data));
		console.log(this.cy()?.edges().map((n: any) => n._private.data)); */
	}
	getNodes = () => this.cy()?.nodes().map((n: any) => n._private.data)
	getEdges = () => this.cy()?.edges().map((n: any) => n._private.data)
}

function generateUUID() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Set version to 4 and variant to 10 (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

