import React, { Component } from 'react'
import { Loader, Dimmer, Header, Grid, Segment, Image } from 'semantic-ui-react'
import Slider from "react-slick"
import RadarChart from './RadarChart'
import Typist from 'react-typist'
import TypistLoop from 'react-typist-loop'
import InstagramSearch from './InstagramSearch.js'

import mhilogo from './mhi_logo.png'

import './App.css'
import 'slick-carousel/slick/slick.css'
import 'slick-carousel/slick/slick-theme.css'
import 'semantic-ui-css/semantic.min.css'

class Summary extends Component {
  render () {
    const { depressingPicsNo } = this.props

    if (depressingPicsNo === 0) {
      return (
        <h3 style={{paddingTop: '50px'}}>
          It is wonderful that your friend shows no signs of mental illness. But remember, check in on them even when they seem they’re fine!
        </h3>
      )
    }

    return (
      <div>
        <h3 style={{paddingTop: '50px'}}>
          Identified <strong>{depressingPicsNo}</strong> images that displays symptoms related to poor mental health.<br/>
        </h3>
        <p>
          Please check in on them, spend some quality time, and hear them out. Sometimes a talk can be a big help!<br/>
          If you think they are in a place where you can’t help them, provide them with support lines and professional guidance.
        </p>
      </div>
    )
  }
}

class FirstPage extends Component {
  render () {
    return (
      <div>
        <Header as='h2'>
        <Image src={mhilogo} style={{ width: '4.0em', paddingRight: '25px' }}/>
        <Header.Content>
          Is Your Instagram Friend <TypistLoop interval={3000}>
            {[
              'Depressed?',
              'Healthy?',
              'Stressed?',
            ].map(text => <Typist key={text} startDelay={1000}>{text}</Typist>)}
          </TypistLoop>
        </Header.Content>
      </Header>
      <InstagramSearch
        setHasSearched={this.props.setHasSearched}
        setComputingText={this.props.setComputingText}
        setPossiblyDepressedPictures={this.props.setPossiblyDepressedPictures}
        setIsComputing={this.props.setIsComputing}
        />
      </div>
    )
  }
}

class SecondPage extends Component {
  render () {
    const { possiblyDepressedPictures, isComputing, computingText } = this.props
    return (
      isComputing ?
      <Segment style={{height: '100vh'}}>
        <Dimmer style={{height: '100vh', width: '100%'}} active inverted>
          <Loader>{computingText}</Loader>
        </Dimmer>
      </Segment>
      :
      <div style={{marginTop: '100px'}}>
        <Summary depressingPicsNo={possiblyDepressedPictures.length} />
        <hr />
        <Slider
          dots={true}
          fade={true}
          arrows={true}
          className='slides'
        >
          {
            possiblyDepressedPictures.map((x) => {
              return (
                <Grid columns={2}>
                  <Grid.Row>
                    <Grid.Column>
                      <RadarChart {...x} />
                    </Grid.Column>
                    <Grid.Column>
                      <Image centered={true} height={350} src={x.image} />
                    </Grid.Column>
                  </Grid.Row>
                </Grid>
              )
            })
          }
        </Slider>
        <br/><br/><br/>
        <hr />
        <p>
          Implementation loosely based on <a href='https://arxiv.org/pdf/1608.03282.pdf'>this arxiv paper.</a><br/>
          <a href='#' onClick={() => this.props.setHasSearched(false)}>Do another search.</a>
        </p>
      </div>
    )
  }
}

class App extends Component {
  state = {
    hasSearched: false,
    isComputing: false,
    computingText: 'Loading...',
    possiblyDepressedPictures: undefined
  }

  setHasSearched = (b) => {
    this.setState({ hasSearched: b })
  }

  setComputingText = (t) => {
    this.setState({ computingText: t })
  }

  setIsComputing = (b) => {
    this.setState({ isComputing: b })
  }

  setPossiblyDepressedPictures = (p) => {
    this.setState({ possiblyDepressedPictures: p })
  }

  render() {
    const { hasSearched, isComputing, computingText, possiblyDepressedPictures } = this.state

    return (
      <Grid columns={3} verticalAlign='middle' style={{ height: '100vh' }}>
        <Grid.Row stretched verticalAlign='middle'>
          <Grid.Column width={2}/>
          <Grid.Column verticalAlign='middle' textAlign='center' width={12}>
            <Segment vertical textAlign='center' style={{marginTop: '-15vh'}}>
              {
                !hasSearched ?
                <FirstPage
                  setHasSearched={this.setHasSearched}
                  setComputingText={this.setComputingText}
                  setPossiblyDepressedPictures={this.setPossiblyDepressedPictures}
                  setIsComputing={this.setIsComputing}
                /> :
                <SecondPage
                  possiblyDepressedPictures={possiblyDepressedPictures}
                  isComputing={isComputing}
                  computingText={computingText}
                  setHasSearched={this.setHasSearched}
                />
              }
            </Segment>
          </Grid.Column>
          <Grid.Column width={2}/>
        </Grid.Row>
      </Grid>
    )
  }
}

export default App
