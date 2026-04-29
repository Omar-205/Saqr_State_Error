import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class MasonSolver {
  constructor() {}

  solve(nodes: any[], edges: any[]) {
    const adjList = this.convertToAdjList(nodes, edges);

    const forwardPaths = this.findForwardPaths(adjList, 'input', 'output');

    const allLoops = this.findLoops(adjList);

    const uniqueLoops = this.filterUniqueLoops(allLoops);

    console.log('Forward Paths:', forwardPaths);
    console.log('Unique Loops:', uniqueLoops);

    const allNonTouchingLoops = this.getAllNonTouchingLoops(uniqueLoops);

    // hena habd2 27seb 2wel 7aga hea 2l determint 2l kebera 2ly hea 1- all non touching loops + all non touching loops of size 2 - all non touching loops of size 3 + ...
    let delta = 1;

    for(let i = 0; i < uniqueLoops.length; i++) {
      delta -= this.getLoopGain(uniqueLoops[i], adjList);
    }

    for (let i = 2; i < allNonTouchingLoops.length; i++) {
      const currentLevelGroups = allNonTouchingLoops[i];
      if (!currentLevelGroups || currentLevelGroups.length === 0) {
          break; 
      }
      
      const gainProduct = currentLevelGroups.reduce((acc, group) => {
        const groupGain = group.reduce((gAcc, loop) => gAcc * this.getLoopGain(loop, adjList), 1);
        return acc + groupGain;
      }, 0);

      delta += (i % 2 === 0 ? 1 : -1) * gainProduct;
    }

    if(delta === 0){
      console.error('Delta is zero, system is unstable or has infinite gain.');
      return "Undefined (Delta is zero) System is unstable or has infinite gain.";
    }

    let overallGain = 0;

    forwardPaths.forEach(path => {
      const pathGain = this.getPathGain(path, adjList);
      const { independentLoops, nonTouchingGroups } = this.getPathNonTouchingLoops(path, uniqueLoops);

      let deltaPath = 1;

      independentLoops.forEach(loop => {
        deltaPath -= this.getLoopGain(loop, adjList);
      });

      for (let i = 2; i < nonTouchingGroups.length; i++) {
        const currentLevelGroups = nonTouchingGroups[i];
        if (!currentLevelGroups || currentLevelGroups.length === 0) {
            break; 
        }
        
        const gainProduct = currentLevelGroups.reduce((acc, group) => {
          const groupGain = group.reduce((gAcc, loop) => gAcc * this.getLoopGain(loop, adjList), 1);
          return acc + groupGain;
        }, 0);

        deltaPath += (i % 2 === 0 ? 1 : -1) * gainProduct;
      }
      overallGain += (pathGain * deltaPath);

      console.log(`Path: ${path.join('->')}, Gain: ${pathGain}, Delta Path: ${deltaPath}`);
    });

    overallGain /= delta;

    console.log('Overall Gain (Transfer Function):', overallGain);

    return overallGain;
  }

  private getPathNonTouchingLoops(path: string[], uniqueLoops: string[][]) {

    const pathIndependentLoops = uniqueLoops.filter(loop => !this.isTouching(path, loop));
    return {
        independentLoops: pathIndependentLoops, 
        nonTouchingGroups: this.getAllNonTouchingLoops(pathIndependentLoops)
    };
  }

  private convertToAdjList(nodes: any[], edges: any[]) {
    // hena 2na h3mel adjacency list mn el nodes wel edges 3a4an yb2a sahel 3lya 23mel 2l dfs 
    // w 2ana bageb 2l paths w 2l loops
    const adjList: any = {};
    nodes.forEach(node => {
      adjList[node.id] = [];
    });
    edges.forEach(edge => {
      adjList[edge.source].push({ target: edge.target, weight: edge.weight });
    });
    return adjList;
  }

  private findForwardPaths(adjList: any, start: string, end: string) {
    const allPaths: any[] = [];
    this.dfsForwardPaths(adjList, start, end, new Set(), [], allPaths);
    return allPaths;
  }

  private findLoops(adjList: any) {
    const loops: any[] = [];
    Object.keys(adjList).forEach(node => {
      this.dfsLoops(adjList, node, new Set(), [], loops);
    });
    return loops
  }

  private dfsForwardPaths(adjList: any ,currentNode: string, EndNode: string, visited: Set<string>, path: string[] = [], allPaths: any[] = []) {
    if(visited.has(currentNode)) {
      // loop detected
      return;
    }
    if(currentNode === EndNode) {
      // found a forward path
      console.log('Found forward path:', [...path, currentNode]);
      allPaths.push([...path, currentNode]);
      return;
    }
    visited.add(currentNode);
    path.push(currentNode);
    const neighbors = adjList[currentNode] || [];
    neighbors.forEach((neighbor: any) => {
      this.dfsForwardPaths(adjList,neighbor.target, EndNode, visited, path, allPaths);
    });
    path.pop();
    visited.delete(currentNode);
  }

  private dfsLoops(adjList: any, currentNode: string, visited: Set<string>, path: string[], allLoops: any[]) {
    visited.add(currentNode);
    path.push(currentNode);

    const neighbors = adjList[currentNode] || [];
    for (let neighbor of neighbors) {
        if (path.includes(neighbor.target)) {
          // loop detected
            const startIndex = path.indexOf(neighbor.target);
            const loop = path.slice(startIndex);
            allLoops.push(loop);
            console.log('Found loop:', loop);
        }
        else if (!visited.has(neighbor.target)) {
            this.dfsLoops(adjList, neighbor.target, visited, path, allLoops);
        }
    }
    path.pop();
    visited.delete(currentNode);
  }

  // helper function to filter out duplicate loops (loops that are the same but start at different nodes)
  // but i will made it using normalization not sorting like making the loop start from the node with the smallest id
  private filterUniqueLoops(loops: string[][]) {
  const uniqueLoops: string[][] = [];
  const seen = new Set<string>();

    loops.forEach(loop => {

      const minNode = loop.reduce((min, node) => (node < min ? node : min), loop[0]);
      const minIndex = loop.indexOf(minNode);

      const normalizedLoop = [...loop.slice(minIndex), ...loop.slice(0, minIndex)].join('->');

      if (!seen.has(normalizedLoop)) {
        seen.add(normalizedLoop);
        uniqueLoops.push(loop);
      }
    });

    return uniqueLoops;
  }

  private getPathGain(path: string[], adjList: any): number {
      let gain = 1;
      for (let i = 0; i < path.length - 1; i++) {
          const source = path[i];
          const target = path[i + 1];
          const edge = adjList[source].find((e: any) => e.target === target);
          gain *= Number(edge.weight);
      }
      return gain;
  }

  private getLoopGain(loop: string[], adjList: any): number {
    let gain = 1;
    for (let i = 0; i < loop.length; i++) {
        const source = loop[i];
        const target = loop[(i + 1) % loop.length];
        const edge = adjList[source].find((e: any) => e.target === target);
        gain *= Number(edge.weight);
    }
    return gain;
  }

  private isTouching(path1: string[], path2: string[]): boolean {
    return path1.some(node => path2.includes(node));
  }

  private isNotTouchingAny(candidate: string[], currentSet: string[][]): boolean {
    for (const loop of currentSet) {
        if (this.isTouching(candidate, loop)) {
            return false; 
        }
    }
    return true;
  }

  private getAllNonTouchingLoops(loops: string[][]): string[][][][] {
    const allNonTouchingResults: string[][][][] = []; 

    for (let currentSize = 2; currentSize <= loops.length; currentSize++) {
        const groups = this.findGroupsOfSize(loops, currentSize);
        if (groups.length === 0) break;
        allNonTouchingResults[currentSize] = groups;
    }
    return allNonTouchingResults;
  }

  private findGroupsOfSize(allLoops: string[][], targetSize: number): string[][][] {
    const finalGroups: string[][][] = [];

    const backtrack = (startIndex: number, currentSet: string[][]) => {
        if (currentSet.length === targetSize) {
            finalGroups.push([...currentSet]);
            return;
        }

        for (let i = startIndex; i < allLoops.length; i++) {
            const candidate = allLoops[i];
            if (this.isNotTouchingAny(candidate, currentSet)) {
                currentSet.push(candidate); 
                backtrack(i + 1, currentSet); 
                currentSet.pop(); 
            }
        }
    }
    backtrack(0, []);
    return finalGroups;
  }
}