import { Injectable } from '@angular/core';

export type MasonLoopDetail = {
  id: string;
  nodes: string[];
  gain: number;
};

export type MasonForwardPathDetail = {
  id: string;
  nodes: string[];
  gain: number;
};

export type MasonNonTouchingGroupDetail = {
  size: number;
  sign: number;
  groups: {
    loopIds: string[];
    gainProduct: number;
  }[];
  total: number;
};

export type MasonPathDeltaDetail = {
  pathId: string;
  delta: number;
  independentLoopIds: string[];
  nonTouchingGroups: MasonNonTouchingGroupDetail[];
  steps: string[];
};

export type MasonResultDetail = {
  delta: number;
  overallGain: number | string;
  forwardPaths: MasonForwardPathDetail[];
  loops: MasonLoopDetail[];
  nonTouchingGroups: MasonNonTouchingGroupDetail[];
  pathDeltas: MasonPathDeltaDetail[];
  deltaSteps: string[];
  numerator: number;
};

@Injectable({
  providedIn: 'root',
})
export class MasonSolver {
  constructor() {}

  solve(nodes: any[], edges: any[]) {
    const details = this.solveWithDetails(nodes, edges);
    return details.overallGain;
  }

  solveWithDetails(nodes: any[], edges: any[]): MasonResultDetail {
    const adjList = this.convertToAdjList(nodes, edges);

    const forwardPaths = this.findForwardPaths(adjList, 'input', 'output');
    const allLoops = this.findLoops(adjList);
    const uniqueLoops = this.filterUniqueLoops(allLoops);

    const forwardPathDetails: MasonForwardPathDetail[] = forwardPaths.map((path, index) => ({
      id: `P${index + 1}`,
      nodes: path,
      gain: this.getPathGain(path, adjList),
    }));

    const loopDetails: MasonLoopDetail[] = uniqueLoops.map((loop, index) => ({
      id: `L${index + 1}`,
      nodes: loop,
      gain: this.getLoopGain(loop, adjList),
    }));

    const allNonTouchingLoops = this.getAllNonTouchingLoops(uniqueLoops);

    const getLoopId = (loop: string[]) => {
      const idx = uniqueLoops.indexOf(loop);
      return idx >= 0 ? loopDetails[idx].id : 'L?';
    };

    // hena habd2 27seb 2wel 7aga hea 2l determint 2l kebera 2ly hea 1- all non touching loops + all non touching loops of size 2 - all non touching loops of size 3 + ...
    let delta = 1;

    for (let i = 0; i < uniqueLoops.length; i++) {
      delta -= this.getLoopGain(uniqueLoops[i], adjList);
    }

    const nonTouchingGroupDetails: MasonNonTouchingGroupDetail[] = [];

    for (let i = 2; i < allNonTouchingLoops.length; i++) {
      const currentLevelGroups = allNonTouchingLoops[i];
      if (!currentLevelGroups || currentLevelGroups.length === 0) {
        break;
      }

      const groups = currentLevelGroups.map(group => {
        const loopIds = group.map(loop => getLoopId(loop));
        const gainProduct = group.reduce((gAcc, loop) => gAcc * this.getLoopGain(loop, adjList), 1);
        return { loopIds, gainProduct };
      });

      const total = groups.reduce((acc, group) => acc + group.gainProduct, 0);
      const sign = i % 2 === 0 ? 1 : -1;

      nonTouchingGroupDetails.push({
        size: i,
        sign,
        groups,
        total,
      });

      delta += sign * total;
    }

    const deltaSteps: string[] = [];
    if (loopDetails.length) {
      deltaSteps.push(`Loop gains: ${loopDetails.map(loop => `${loop.id}=${loop.gain.toFixed(4)}`).join(', ')}`);
      deltaSteps.push(`Δ = 1 - (${loopDetails.map(loop => loop.id).join(' + ')})`);
    } else {
      deltaSteps.push('No loops found. Δ = 1');
    }

    nonTouchingGroupDetails.forEach(detail => {
      const term = detail.groups.map(group => group.loopIds.join('*')).join(' + ');
      const signText = detail.sign > 0 ? '+' : '-';
      deltaSteps.push(`${signText} (${term}) = ${detail.total.toFixed(4)}`);
    });

    if (delta === 0) {
      console.error('Delta is zero, system is unstable or has infinite gain.');
      return {
        delta,
        overallGain: 'Undefined (Delta is zero) System is unstable or has infinite gain.',
        forwardPaths: forwardPathDetails,
        loops: loopDetails,
        nonTouchingGroups: nonTouchingGroupDetails,
        pathDeltas: [],
        deltaSteps,
        numerator: 0,
      };
    }

    let numerator = 0;
    const pathDeltas: MasonPathDeltaDetail[] = [];

    forwardPaths.forEach((path, index) => {
      const pathGain = this.getPathGain(path, adjList);
      const { independentLoops, nonTouchingGroups } = this.getPathNonTouchingLoops(path, uniqueLoops);

      let deltaPath = 1;
      const stepLines: string[] = [];
      const independentLoopIds = independentLoops.map(loop => getLoopId(loop));

      if (independentLoops.length) {
        independentLoops.forEach(loop => {
          deltaPath -= this.getLoopGain(loop, adjList);
        });
        stepLines.push(`Δ${index + 1} = 1 - (${independentLoopIds.join(' + ')})`);
      } else {
        stepLines.push(`Δ${index + 1} = 1 (no touching loops)`);
      }

      const pathNonTouchingDetails: MasonNonTouchingGroupDetail[] = [];

      for (let i = 2; i < nonTouchingGroups.length; i++) {
        const currentLevelGroups = nonTouchingGroups[i];
        if (!currentLevelGroups || currentLevelGroups.length === 0) {
          break;
        }

        const groups = currentLevelGroups.map(group => {
          const loopIds = group.map(loop => getLoopId(loop));
          const gainProduct = group.reduce((gAcc, loop) => gAcc * this.getLoopGain(loop, adjList), 1);
          return { loopIds, gainProduct };
        });

        const total = groups.reduce((acc, group) => acc + group.gainProduct, 0);
        const sign = i % 2 === 0 ? 1 : -1;
        deltaPath += sign * total;

        pathNonTouchingDetails.push({
          size: i,
          sign,
          groups,
          total,
        });

        const term = groups.map(group => group.loopIds.join('*')).join(' + ');
        const signText = sign > 0 ? '+' : '-';
        stepLines.push(`${signText} (${term}) = ${total.toFixed(4)}`);
      }

      numerator += pathGain * deltaPath;

      pathDeltas.push({
        pathId: `P${index + 1}`,
        delta: deltaPath,
        independentLoopIds,
        nonTouchingGroups: pathNonTouchingDetails,
        steps: stepLines,
      });

      console.log(`Path: ${path.join('->')}, Gain: ${pathGain}, Delta Path: ${deltaPath}`);
    });

    const overallGain = numerator / delta;
    console.log('Overall Gain (Transfer Function):', overallGain);

    return {
      delta,
      overallGain,
      forwardPaths: forwardPathDetails,
      loops: loopDetails,
      nonTouchingGroups: nonTouchingGroupDetails,
      pathDeltas,
      deltaSteps,
      numerator,
    };
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
